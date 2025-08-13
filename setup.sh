#!/bin/bash

GREEN="\033[1;32m"
NORMAL="\033[0m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"

site_name=$(basename "$(pwd)")

# Check if WordPress is already installed
if [ -d wp-admin ]; then
    echo -e "${YELLOW}WordPress is already installed. Aborting setup.${NORMAL}"
    exit 1
fi

# Backup the entire wp-content directory
if [ -d wp-content ]; then
    echo -e "${CYAN}Backing up wp-content directory...${NORMAL}"
    mv wp-content wp-content_backup
    echo -e "${GREEN}Backup completed${NORMAL}"
fi

# Download WordPress
echo -e "${CYAN}Downloading WordPress...${NORMAL}"
wp core download > /dev/null 2>&1
echo -e "${GREEN}Finished downloading WordPress...${NORMAL}"

# Restore the wp-content directory from the backup
if [ -d wp-content_backup ]; then
    echo -e "${CYAN}Restoring wp-content directory from backup...${NORMAL}"
    rm -rf wp-content
    mv wp-content_backup wp-content
    echo -e "${GREEN}wp-content directory restored${NORMAL}"
fi

# Delete the plugins folder
echo -e "${CYAN}Deleting the plugins folder...${NORMAL}"
rm -rf wp-content/plugins/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deleted the plugins folder successfully.${NORMAL}"
else
    echo -e "${YELLOW}Failed to delete the plugins folder.${NORMAL}"
fi

# Recreate the plugins folder
echo -e "${CYAN}Recreating the plugins folder...${NORMAL}"
mkdir wp-content/plugins/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Recreated the plugins folder successfully.${NORMAL}"
else
    echo -e "${YELLOW}Failed to recreate the plugins folder.${NORMAL}"
fi

# Check if startdigital theme directory exists
if [ -d wp-content/themes/startdigital ]; then
    echo -e "${CYAN}Navigating to the startdigital theme directory...${NORMAL}"
    cd wp-content/themes/startdigital

    echo -e "${CYAN}Running composer install in startdigital theme directory...${NORMAL}"
    composer install > /dev/null 2>&1
    echo -e "${GREEN}Composer installed${NORMAL}"

    echo -e "${CYAN}Running npm install in startdigital theme directory...${NORMAL}"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}Npm installed${NORMAL}"

    # Navigate back to the root directory
    cd ../../../
else
    echo -e "${YELLOW}startdigital theme directory not found. Skipping...${NORMAL}"
fi

# Copy .env.sample to .env
echo -e "${CYAN}Copying .env.sample to .env...${NORMAL}"
cp .env.sample .env

echo -e "To generate WordPress salts, please visit the following link:\n"
echo -e "\033[4;34mhttps://roots.io/salts.html\033[0m\n"
echo -e "Copy and paste the generated salts into your .env file."

echo -e "${GREEN}Setup completed successfully!${NORMAL}"
