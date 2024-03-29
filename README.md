# Scheduler

## Table of content

- [Installation](#installation)
  - [Docker](#docker)
    - [Download from DockerHub](#download-from-dockerhub)
    - [Build Docker image](#build-image-from-source)
  - [Build from source](#from-source)
- [API docs](#api-docs)

## Installation

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

#### Build image from source

0. Make sure git is installed

   ```
   sudo apt install git
   ```

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
   docker container create --name scheduler_container -p 8000:8000 -v /sys:/sys -e TOKEN_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50) scheduler
   ```
4. Start the container
   ```
   docker start scheduler_container
   ```

#### Download from DockerHub

1. Create the container
   ```
   docker container create --name scheduler_container -p 8000:8000 -v /sys:/sys -e TOKEN_KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50) -e DATABASE_FOLDER=database mohamednehad450/scheduler
   ```
2. Start the container
   ```
   docker start scheduler_container
   ```

### From source

0. Make sure git is installed

   ```
   sudo apt install git
   ```

1. Install node 18 using [nvm](https://github.com/nvm-sh/nvm) or from [here](https://nodejs.org/en/download/)

2. Clone this project
   ```
   git clone https://github.com/mohamednehad450/Scheduler.git
   cd Scheduler
   ```
3. Install dependencies
   ```
   npm install -g pnpm
   pnpm i
   ```
   If you are having troubles installing, make sure you are running gcc/g++ -v 4.8 or higher. [Here](https://github.com/fivdi/onoff/wiki/Node.js-v4-and-native-addons) is an installation guide.
4. Build the project
   ```
   pnpm build
   ```
5. Add environment variables to the `.env` file

   ```
   # Database file name
   echo DATABASE_FOLDER=\"database\" >> .env

   # Random 50 characters long string for token signing
   echo TOKEN_KEY=\"$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 50)\" >> .env

   # Server port, Default is 8000
   echo PORT=\"8000\" >> .env
   ```

6. Start the server
   ```
   pnpm start
   ```

## API docs

All of the API documentation and database models are in `api-docs.yaml`,you can view it in [SwaggerHub](https://app.swaggerhub.com/apis/mohamednehad450/Scheduler/1.2#).
