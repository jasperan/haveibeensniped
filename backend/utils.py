"""
Utility functions for region mapping and data processing
"""

# Regional routing mapping for Riot API
REGION_TO_REGIONAL = {
    'NA1': 'americas',
    'BR1': 'americas',
    'LA1': 'americas',
    'LA2': 'americas',
    'EUW1': 'europe',
    'EUNE1': 'europe',
    'TR1': 'europe',
    'RU': 'europe',
    'KR': 'asia',
    'JP1': 'asia',
    'OC1': 'sea',
    'PH2': 'sea',
    'SG2': 'sea',
    'TH2': 'sea',
    'TW2': 'sea',
    'VN2': 'sea',
}

def get_regional_endpoint(platform: str) -> str:
    """
    Convert platform code to regional endpoint for Account API
    
    Args:
        platform: Platform code (e.g., 'NA1', 'EUW1')
    
    Returns:
        Regional endpoint (e.g., 'americas', 'europe')
    """
    return REGION_TO_REGIONAL.get(platform.upper(), 'americas')

def get_platform_endpoint(platform: str) -> str:
    """
    Get the platform-specific endpoint URL
    
    Args:
        platform: Platform code (e.g., 'NA1', 'EUW1')
    
    Returns:
        Platform endpoint URL
    """
    return platform.lower()

