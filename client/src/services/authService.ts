import axios from "axios";
import { ResponsiveEmbed } from "react-bootstrap";

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        //throw error;
    }
);

export interface IBotSettings {
    username: string;
    oauth: string;
}

class AuthService {
    public static isAuthenticated(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public static async saveBotDetails(username: string, oauth: string): Promise<boolean> {
        try {
            return await axios.post("/api/twitch/botSettings", { username, oauth });
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    public static async getBotDetails(): Promise<IBotSettings> {
        try {
            const response = await axios.get("/api/twitch/botSettings");
            return response.data;
        } catch (e) {
            return Promise.resolve({ username: "", oauth: "" });
        }
    }
}

export default AuthService;
