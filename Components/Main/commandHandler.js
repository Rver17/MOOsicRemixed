const fs = require('fs');
const path = require('path');

const loadCommands = (commandsPath) => {
    const commands = new Map();
    
    // Assuming the COMMANDS folder is at the root level of your project
    const absoluteCommandsPath = path.join(__dirname, '..', '..', commandsPath);
    const commandFiles = fs.readdirSync(absoluteCommandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(absoluteCommandsPath, file));
        commands.set(command.name, command);
    }

    return commands;
};

module.exports = { loadCommands };
