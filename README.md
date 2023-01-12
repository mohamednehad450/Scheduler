# Scheduler

## Table of content
 - [Installation](#installation)
 - [API docs](#api-docs)

## Compatibility

This tool only works with 64bit operating systems (due to prisma not supporting 32bit arm), which meant that it's only compatible with raspberry pi 3, 4 and zero 2. 

[Raspberry Pi OS 64bit](https://www.raspberrypi.com/software/operating-systems/#raspberry-pi-os-64-bit) is recommend for this tool

## Installation

### From source

1. Install node 18 using [nvm](https://github.com/nvm-sh/nvm) or from [here](https://nodejs.org/en/download/)

2. Make sure git is installed
    ```
    sudo apt install git
    ```

3. Clone this project
    ```
    git clone https://github.com/mohamednehad450/Scheduler.git
    cd Scheduler
    ```
4. Install dependencies
    ```
    npx -y yarn install
    ```
    If you are having troubles installing, make sure you are running gcc/g++ -v 4.8 or higher. [Here](https://github.com/fivdi/onoff/wiki/Node.js-v4-and-native-addons) is an installation guide.
5. Generate prisma client
    ```
    npx yarn prisma generate
    ```
6. Build the project
    ``` 
    npx yarn build
    ```
7. Add environment variables to the `.env` file
    ```
    # Database file name
    echo DATABASE_URL=\"file:db.db\" >> .env
    
    # Random 50 characters long string for token signing
    echo TOKEN_KEY=\"$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50)\" >> .env
    
    ```
8. Start the server
    ```
    npx yarn start
    ```


### Docker

#### Install Docker
1. Install docker
    ```
    curl -sSL https://get.docker.com | sh
    ```
2. Allow Docker to be used without being a root
    ```
    sudo usermod -aG docker $USER
    ```
3. Restart
    ``` 
    reboot
    ```
- Build image from source
    1. Clone this project
        ```
        git clone https://github.com/mohamednehad450/Scheduler.git
        cd Scheduler
        ```
    2. Build the image 
        ``` 
        docker build -t scheduler .
        ```
    3. Create a container
        ```
        docker container create --name scheduler_container -p 8000:8000 -v /sys:/sys -e TOKEN_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50) -e DATABASE_URL=file:db.db scheduler
        ```
    4. Start the container
        ```
        docker start scheduler_container
        ```

- Download from DockerHub
    1. Create the container 
        ```
        docker container create --name scheduler_container -p 8000:8000 -v /sys:/sys -e TOKEN_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50) -e DATABASE_URL=file:db.db mohamednehad450/scheduler:1.0
        ```
    2. Start the container
        ```
        docker start scheduler_container
        ```
    

## API docs

 All of the API documentation and database models are in `api-docs.yaml`,you can view it in [SwaggerHub](https://app.swaggerhub.com/apis/MOHAMMEDNEHAD550/Scheduler/1.0#/default/post_sequence).

