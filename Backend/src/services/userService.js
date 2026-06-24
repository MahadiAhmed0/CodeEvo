const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../../data/users.json');

const readUsersFromFile = () => {
    try {
        const usersData = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(usersData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, return empty array
            return [];
        }
        console.error('Error reading users file:', error);
        return [];
    }
};

const writeUsersToFile = (users) => {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing users file:', error);
    }
};

const UserService = {
    getAllUsers: () => {
        return readUsersFromFile();
    },

    getUserById: (id) => {
        const users = readUsersFromFile();
        return users.find(user => user.id === id);
    },

    createUser: (userData) => {
        const users = readUsersFromFile();
        const newUser = { id: Date.now().toString(), ...userData };
        users.push(newUser);
        writeUsersToFile(users);
        return newUser;
    },

    updateUser: (id, updatedData) => {
        let users = readUsersFromFile();
        const index = users.findIndex(user => user.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updatedData, id: id };
            writeUsersToFile(users);
            return users[index];
        }
        return null;
    },

    deleteUser: (id) => {
        let users = readUsersFromFile();
        const initialLength = users.length;
        users = users.filter(user => user.id !== id);
        writeUsersToFile(users);
        return users.length < initialLength; // True if a user was deleted
    }
};

module.exports = UserService;
