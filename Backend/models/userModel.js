const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

let users = []; // In-memory array to store user data

const findUserByEmail = (email) => {
    return users.find(user => user.email === email);
};

const findUserById = (id) => {
    return users.find(user => user.id === id);
};

const createUser = async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: uuidv4(),
        username,
        email,
        password: hashedPassword // Store hashed password
    };
    users.push(newUser);
    return newUser;
};

const updateUser = async (id, updates) => {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) {
        return null;
    }

    const user = users[userIndex];
    if (updates.username) {
        user.username = updates.username;
    }
    if (updates.email) {
        user.email = updates.email;
    }
    if (updates.password) {
        user.password = await bcrypt.hash(updates.password, 10);
    }
    users[userIndex] = user;
    return user;
};

const deleteUser = (id) => {
    const initialLength = users.length;
    users = users.filter(user => user.id !== id);
    return users.length < initialLength; // True if a user was deleted
};

const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    updateUser,
    deleteUser,
    comparePassword
};
