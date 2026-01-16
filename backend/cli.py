#!/usr/bin/env python3
"""
Have I Been Sniped - Interactive CLI
"""
import os
import sys
import yaml
import json
import time
from typing import Dict, Optional

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from riot_client import RiotAPIClient
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.yaml')
MEMORY_FILE = os.path.join(os.path.dirname(__file__), '.cli_memory.json')

def load_config() -> Dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return yaml.safe_load(f)
    return {}

def save_config(config: Dict):
    with open(CONFIG_FILE, 'w') as f:
        yaml.dump(config, f)

def load_memory() -> Dict:
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_memory(memory: Dict):
    with open(MEMORY_FILE, 'w') as f:
        json.dump(memory, f)

def get_riot_client(config: Dict) -> Optional[RiotAPIClient]:
    api_key = config.get('riot_api_key')
    if not api_key or api_key == 'RGAPI-YOUR-API-KEY-HERE':
        return None
    return RiotAPIClient(api_key)

def print_header():
    console.clear()
    console.print(Panel.fit(
        "[bold red]HAVE I BEEN SNIPED?[/bold red]\n[dim]League of Legends Match Analyzer[/dim]",
        border_style="red"
    ))

def manage_config():
    print_header()
    console.print("[bold yellow]Configuration Management[/bold yellow]\n")
    
    config = load_config()
    current_key = config.get('riot_api_key', 'Not Set')
    
    if current_key != 'Not Set' and len(current_key) > 8:
        masked_key = f"{current_key[:4]}...{current_key[-4:]}"
    else:
        masked_key = current_key
        
    console.print(f"Current API Key: [cyan]{masked_key}[/cyan]")
    
    if Confirm.ask("Do you want to update the API Key?"):
        new_key = Prompt.ask("Enter new Riot API Key")
        if new_key:
            config['riot_api_key'] = new_key
            save_config(config)
            console.print("[green]Configuration saved![/green]")
            time.sleep(1)

def check_integrity():
    print_header()
    console.print("[bold yellow]API Integrity Check[/bold yellow]\n")
    
    config = load_config()
    client = get_riot_client(config)
    
    if not client:
        console.print("[red]Error: API Key not configured.[/red]")
        Prompt.ask("Press Enter to continue")
        return

    # Use a known stable account for testing or own account
    console.print("We need a valid Riot ID to test the API connection.")
    game_name = Prompt.ask("Enter a known Game Name", default="Riot")
    tag_line = Prompt.ask("Enter Tag Line", default="NA1") # Assuming a default/dummy
    region = Prompt.ask("Enter Region", default="NA1")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True
    ) as progress:
        task = progress.add_task("[cyan]Checking API connection...", total=1)
        
        try:
            puuid = client.get_puuid_by_riot_id(game_name, tag_line, region)
            
            if puuid:
                console.print(f"[green]Success! API Key is valid.[/green]")
                console.print(f"Resolved PUUID: {puuid[:10]}...")
            else:
                console.print("[red]Failed: Could not resolve player. Key might be invalid or player not found.[/red]")
        except Exception as e:
             console.print(f"[red]Error during check: {e}[/red]")
             
    Prompt.ask("\nPress Enter to continue")

def query_user():
    print_header()
    config = load_config()
    client = get_riot_client(config)
    
    if not client:
        console.print("[red]Error: API Key not configured. Go to Config first.[/red]")
        Prompt.ask("Press Enter to continue")
        return

    memory = load_memory()
    last_name = memory.get('game_name', '')
    last_tag = memory.get('tag_line', '')
    last_region = memory.get('region', 'NA1')
    
    console.print("[bold cyan]Enter Target Player[/bold cyan]")
    game_name = Prompt.ask("Game Name", default=last_name)
    tag_line = Prompt.ask("Tag Line", default=last_tag)
    region = Prompt.ask("Region", default=last_region)
    
    # Update memory
    memory.update({
        'game_name': game_name,
        'tag_line': tag_line,
        'region': region
    })
    save_memory(memory)
    
    # Process
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True
        ) as progress:
            
            # Step 1: Get PUUID
            task = progress.add_task("[cyan]Fetching PUUID...", total=None)
            puuid = client.get_puuid_by_riot_id(game_name, tag_line, region)
            
            if not puuid:
                console.print("[red]Player not found![/red]")
                Prompt.ask("Press Enter to continue")
                return
                
            # Step 2: Get Active Game
            progress.update(task, description="Checking for active game...")
            game_data = client.get_active_game(puuid, region)
            
            if not game_data:
                console.print("[yellow]Player is not currently in a live game.[/yellow]")
                Prompt.ask("Press Enter to continue")
                return
            
            # Step 3: Analyze Participants
            progress.update(task, description="Analyzing participants (this may take a while)...")
            
            participants = game_data.get('participants', [])
            lobby_puuids = [p['puuid'] for p in participants]
            
            # Use backend logic structure directly or reuse client method
            # Reusing client method: analyze_match_history
            analysis = client.analyze_match_history(puuid, lobby_puuids, region, match_count=20) # Limit to 20 for speed in CLI
            
            # Display Results
            console.clear()
            print_header()
            console.print(f"Active Game Found: [bold]{game_data.get('gameMode', 'UNKNOWN')}[/bold]")
            
            if not analysis:
                console.print("[green]No snipers found! (No recent shared matches)[/green]")
            else:
                table = Table(title=f"Potential Snipers (Shared Matches in last 20 games)")
                table.add_column("Player", style="cyan")
                table.add_column("Games With", justify="right")
                table.add_column("Win Rate", justify="right")
                table.add_column("Last Played", style="dim")
                
                for p_puuid, data in analysis.items():
                    # Find participant name
                    p_info = next((x for x in participants if x['puuid'] == p_puuid), None)
                    name = "Unknown"
                    if p_info:
                        riot_id = p_info.get('riotId', '')
                        if '#' in riot_id:
                            name = riot_id
                        else:
                            name = p_info.get('summonerName', 'Unknown')
                    
                    matches = data.get('matches', [])
                    last_played = "N/A"
                    if matches:
                         # Simple timestamp conversion if needed, or just count
                         last_played = "Recently"

                    wins = data['wins']
                    total = data['totalGames']
                    wr = int((wins/total)*100)
                    
                    table.add_row(name, str(total), f"{wr}%", last_played)
                
                console.print(table)
            
            Prompt.ask("\nPress Enter to return to menu")
            
    except Exception as e:
        console.print(f"[red]An error occurred: {e}[/red]")
        Prompt.ask("Press Enter to continue")


def main_menu():
    while True:
        print_header()
        
        table = Table(show_header=False, box=None)
        table.add_column("Id", style="cyan", justify="right")
        table.add_column("Task", style="white")
        
        table.add_row("[1]", "Query User (Active Game & Snipes)")
        table.add_row("[2]", "Manage Configuration (API Key)")
        table.add_row("[3]", "Check Integrity (Validate connection)")
        table.add_row("[0]", "Exit")
        
        console.print(table)
        console.print("\n")
        
        choice = Prompt.ask("Enter choice", choices=["1", "2", "3", "0"], default="1")
        
        if choice == "0":
            console.print("[yellow]Goodbye![/yellow]")
            break
        elif choice == "1":
            query_user()
        elif choice == "2":
            manage_config()
        elif choice == "3":
            check_integrity()

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
