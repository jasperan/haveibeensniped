#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# haveibeensniped — One-Command Installer
# Have I Been Sniped?
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jasperan/haveibeensniped/main/install.sh | bash
#
# Override install location:
#   PROJECT_DIR=/opt/myapp curl -fsSL ... | bash
# ============================================================

REPO_URL="https://github.com/jasperan/haveibeensniped.git"
PROJECT="haveibeensniped"
BRANCH="main"
INSTALL_DIR="${PROJECT_DIR:-$(pwd)/$PROJECT}"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}!${NC} $1"; }
fail()    { echo -e "${RED}✗ $1${NC}"; exit 1; }
command_exists() { command -v "$1" &>/dev/null; }

print_banner() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  haveibeensniped${NC}"
    echo -e "  Have I Been Sniped?"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

clone_repo() {
    if [ -d "$INSTALL_DIR" ]; then
        warn "Directory $INSTALL_DIR already exists"
        info "Pulling latest changes..."
        (cd "$INSTALL_DIR" && git pull origin "$BRANCH" 2>/dev/null) || true
    else
        info "Cloning repository..."
        git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR" || fail "Clone failed. Check your internet connection."
    fi
    success "Repository ready at $INSTALL_DIR"
}

check_prereqs() {
    info "Checking prerequisites..."
    command_exists git || fail "Git is required — https://git-scm.com/"
    success "Git $(git --version | cut -d' ' -f3)"

    command_exists node || fail "Node.js is required — https://nodejs.org/"
    success "Node $(node --version)"

    if command_exists pnpm; then
        PKG_MGR="pnpm"
    elif command_exists yarn; then
        PKG_MGR="yarn"
    elif command_exists npm; then
        PKG_MGR="npm"
    else
        fail "npm, yarn, or pnpm is required"
    fi
    success "Package manager: $PKG_MGR"

    command_exists python3 || fail "python3 is required for the backend"
    success "Python $(python3 --version | cut -d' ' -f2)"
}

install_deps() {
    cd "$INSTALL_DIR"
    info "Installing dependencies..."
    $PKG_MGR install
    success "Dependencies installed"

    info "Installing backend dependencies..."
    if [ ! -d backend/.venv ]; then
        python3 -m venv backend/.venv
        success "Created backend virtual environment"
    fi
    # shellcheck disable=SC1091
    source backend/.venv/bin/activate
    python -m pip install --upgrade pip >/dev/null
    python -m pip install -r backend/requirements.txt
    deactivate
    success "Backend dependencies installed"

    if [ ! -f backend/config.yaml ]; then
        cp backend/config.yaml.example backend/config.yaml
        success "Created backend/config.yaml from example"
    fi

    if [ ! -f .env.local ]; then
        if [ -f .env.local.example ]; then
            cp .env.local.example .env.local
        else
            printf 'VITE_API_URL=http://localhost:5000\n' > .env.local
        fi
        success "Created .env.local from example"
    fi

    if grep -q '"build"' package.json 2>/dev/null; then
        info "Building project..."
        $PKG_MGR run build 2>/dev/null && success "Build complete" || warn "Build step skipped"
    fi
}

main() {
    print_banner
    check_prereqs
    clone_repo
    install_deps
    print_done
}

print_done() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}Installation complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BOLD}Location:${NC}  $INSTALL_DIR"
    echo -e "  ${BOLD}Demo:${NC}      cd $INSTALL_DIR && $PKG_MGR run demo"
    echo -e "  ${BOLD}Backend:${NC}   cd $INSTALL_DIR/backend && source .venv/bin/activate && python main.py"
    echo -e "  ${BOLD}Frontend:${NC}  cd $INSTALL_DIR && $PKG_MGR run dev"
    echo -e "  ${BOLD}Tip:${NC}       Demo mode works even before you add a real Riot API key"
    echo ""
}

main "$@"
