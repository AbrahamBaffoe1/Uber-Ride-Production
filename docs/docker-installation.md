# Docker Installation Guide for macOS

This guide walks you through installing Docker on macOS, which is required for running the containerized PostgreSQL database.

## Option 1: Install Docker Desktop (Recommended)

1. Download Docker Desktop for Mac from the official website:
   [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

2. Open the downloaded `.dmg` file and drag the Docker icon to the Applications folder.

3. Open Docker Desktop from your Applications folder.

4. The Docker daemon will start automatically. You'll see the Docker icon in your status bar.

5. Verify Docker is installed correctly:
   ```bash
   docker --version
   ```

6. Verify Docker Compose is installed correctly:
   ```bash
   docker-compose --version
   ```

## Option 2: Install with Homebrew

1. Make sure you have Homebrew installed. If not, install it:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Docker Desktop:
   ```bash
   brew install --cask docker
   ```

3. Start Docker Desktop:
   ```bash
   open /Applications/Docker.app
   ```

4. Verify Docker is installed correctly:
   ```bash
   docker --version
   ```

## Troubleshooting

If you encounter errors such as "Cannot connect to the Docker daemon" or "Is the docker daemon running?", try:

1. Checking if Docker Desktop is running by looking for the Docker icon in your status bar
2. Restarting Docker Desktop
3. Restarting your computer
4. Running the following commands:
   ```bash
   docker context ls
   docker context use default
