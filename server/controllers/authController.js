import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const uuid = () => crypto.randomUUID();

// MOCK: In-memory users array
// TODO (DBMS Project): Replace with SELECT/INSERT INTO users
let mockUsers = [
    { aadhar_id: 'USR-ADMIN', full_name: 'Admin HQ', email: 'admin@crisischain.com', role: 'admin', is_verified: 1 },
    { aadhar_id: 'USR-HOSP', full_name: 'KMC Hospital', email: 'hospital@crisischain.com', role: 'hospital', is_verified: 1 },
    { aadhar_id: 'USR-RESP', full_name: 'Rescue Team Alpha', email: 'responder@crisischain.com', role: 'responder', is_verified: 1 },
    { aadhar_id: 'USR-CTZN', full_name: 'Standard Citizen', email: 'user@crisischain.com', role: 'user', is_verified: 1 }
];

export const register = async (req, res) => {
    try {
        // eslint-disable-next-line no-unused-vars -- password not yet verified; mock auth stage (see TODOs)
        const { aadhar_id, full_name, email, phone_number, password, role } = req.body;

        const newUser = {
            aadhar_id: aadhar_id || uuid(),
            full_name,
            email,
            phone_number,
            role: role || 'citizen',
            is_verified: 1
        };

        // TODO (DBMS Project): Replace with INSERT INTO users ...
        mockUsers.push(newUser);

        const token = jwt.sign(
            { aadhar_id: newUser.aadhar_id, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.aadhar_id,
                name: newUser.full_name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        // eslint-disable-next-line no-unused-vars -- password not yet verified; mock auth stage (see TODOs)
        const { email, password } = req.body;

        // TODO (DBMS Project): Replace with SELECT * FROM users WHERE email = ?
        let user = mockUsers.find(u => u.email === email);

        if (!user) {
            // Auto-create for mock purposes if doesn't exist
            user = {
                aadhar_id: uuid(),
                full_name: email.split('@')[0],
                email: email,
                phone_number: '0000000000',
                role: 'user', // Default to normal citizen, not admin
                is_verified: 1
            };
            mockUsers.push(user);
        }

        const token = jwt.sign(
            { aadhar_id: user.aadhar_id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.aadhar_id,
                name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const { aadhar_id } = req.user;
        
        // TODO (DBMS Project): Replace with SELECT * FROM users WHERE aadhar_id = ?
        const user = mockUsers.find(u => u.aadhar_id === aadhar_id);
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({
            id: user.aadhar_id,
            name: user.full_name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
