import axios from 'axios';

class AuthService {
    public static isAuthenticated(): Promise<boolean> {
        return Promise.resolve(true);
    }
}

export default AuthService;