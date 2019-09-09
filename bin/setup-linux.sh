#!/bin/bash
# Works for Ubuntu/Mint

sudo test

# Ensure you are executing in the root of the repo 
#  for docker commands to work
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd $SCRIPT_PATH/..

HAS_DOCKER=$(docker --version > /dev/null 2>&1 && echo 1 || echo 0)
HAS_RUBY=$(ruby --version > /dev/null 2>&1 && echo 1 || echo 0)
HAS_MYSQL=$(mysql --version > /dev/null 2>&1 && echo 1 || echo 0)
HAS_HUB=$(hub --version > /dev/null 2>&1 && echo 1 || echo 0)
HAS_BASH_COMPLETION=$(dpkg -l | grep -q bash-completion > /dev/null 2>&1 && echo 1 || echo 0)
HAS_NODE=$(node --version > /dev/null 2>&1 && echo 1 || echo 0)

if [ "$HAS_DOCKER" == "0" ] || [ "$HAS_RUBY" == "0" ] || [ "$HAS_MYSQL" == "0" ] || [ "$HAS_HUB" == "0" ] || [ "$HAS_BASH_COMPLETION" == "0" ] || [ "$HAS_NODE" == "0" ] ; then
    sudo apt-get update
fi

if [ "$HAS_DOCKER" == "0" ] ; then
    echo "Installing docker"
    sudo apt-get remove docker docker-engine docker.io containerd runc
    sudo apt-get update
    sudo apt-get install \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo apt-key fingerprint 0EBFCD88

    RELEASE="$(lsb_release -cs)"
    if [ "$(lsb_release -is)" == LinuxMint ] ; then
        RELEASE="$(cat /etc/upstream-release/lsb-release | grep -oP -o "(?<=DISTRIB_CODENAME=).*")"
    fi

    sudo add-apt-repository \
        "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
        $RELEASE \
        stable"
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    echo "Installing docker-compose"
    sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

if [ "$HAS_RUBY" == "0" ] ; then
    echo "Installing ruby via rbenv"
    sudo apt-get install -y autoconf bison build-essential libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libncurses5-dev libffi-dev libgdbm3 libgdbm-dev
    git clone https://github.com/rbenv/rbenv.git ~/.rbenv
    echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
    echo 'eval "$(rbenv init -)"' >> ~/.bashrc
    source ~/.bashrc
    rbenv install 2.4.1
    rbenv global 2.4.1
fi

if [ "$HAS_MYSQL" == "0" ] ; then
    echo "Intalling mysql-client"
    sudo apt-get install -y mysql-client
fi

if [ "$HAS_HUB" == "0" ] ; then
    echo "Installing hub"
    if !snap --version > /dev/null 2>&1 ; then
        echo "Installing snap to install hub"
        sudo apt-get install -y snapd
    fi
    snap install hub --classic
fi

if [ "$HAS_BASH_COMPLETION" == "0" ] ; then
    echo "Installing bash-completion"
    sudo apt-get -y install bash-completion
fi

if [ "$HAS_NODE" == "0" ] ; then
    echo "Installing node via nvm"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
    nvm install stable
    nvm use stable
fi

gem install bundler --conservative

docker-compose build
npm install && ./node_modules/.bin/webpack --config webpack.config.dev.js
docker-compose up -d db
sleep 10
docker-compose run --rm web rake db:drop db:create db:migrate db:seed
docker-compose run --rm -e RAILS_ENV=test web rake db:drop db:create db:migrate db:seed
docker-compose up -d db redis web resque resque_result_monitor resque_pipeline_monitor elasticsearch
sleep 10
docker-compose run web rake create_elasticsearch_indices