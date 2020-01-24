#!/bin/bash
export PROD_BRANCH="prod"
export PROD_ENV="prod"
export STAGING_BRANCH="staging"
export STAGING_ENV="staging"
export MASTER_BRANCH="master"
export GITHUB_TOKEN; GITHUB_TOKEN=${GITHUB_TOKEN:-$(cut -f 3 -d : ~/.git-credentials | cut -f 1 -d @)}
export GITHUB_REMOTE_ORIGIN; GITHUB_REMOTE_ORIGIN=$(git remote get-url origin | perl -ne '/([^\/\:]+\/.+?)(\.git)?$/ && print $1')
export GITHUB_REPOSITORY_API="https://api.github.com/repos/${GITHUB_REMOTE_ORIGIN}"
export GITHUB_REPOSITORY_URL="https://github.com/${GITHUB_REMOTE_ORIGIN}"
export DOCKER_REPOSITORY_NAME="$GITHUB_REMOTE_ORIGIN"

# Special chars
export TAB=$'\t'
export LF=$'\n'

# Color vars
export BLACK; BLACK="$( { tty -s && tput setaf 0; } || true )"
export RED; RED="$( { tty -s && tput setaf 1; } || true )"
export GREEN; GREEN="$( { tty -s && tput setaf 2; } || true )"
export YELLOW; YELLOW="$( { tty -s && tput setaf 3; } || true )"
export BLUE; BLUE="$( { tty -s && tput setaf 4; } || true )"
export MAGENTA; MAGENTA="$( { tty -s && tput setaf 5; } || true )"
export CYAN; CYAN="$( { tty -s && tput setaf 6; } || true )"
export WHITE; WHITE="$( { tty -s && tput setaf 7; } || true )"
export BOLD; BOLD="$( { tty -s && tput bold; } || true )"
export RESET; RESET="$( { tty -s && tput sgr0; } || true )"
