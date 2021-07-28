import axios, { AxiosError, AxiosResponse } from "axios";
import { useState } from "react";

export enum UserLevels {
    None = 0,
    Viewer = 1,
    Subscriber,
    Moderator,
    Bot,
    Admin,
    Broadcaster,
}

/**
 * Custom hook for accessing the data of the currently logged in user.
 * @returns User object and callback to load the user data.
 */
const useUser = () => {
    const defaultUser: any = {
        streamlabsToken: undefined,
        username: "",
        userLevel: UserLevels.None
    };

    const [user, setUser] = useState(defaultUser);

    const loadUser = () => {
        axios
        .get("/api/isloggedin", {
            withCredentials: true,
        })
        .then((response: AxiosResponse<any>) => {
            if (response.status === 200) {
                const userWrapper: any = { user: response.data };
                setUser(userWrapper.user);
            } else if (response.status === 403) {
                setUser(defaultUser);
            }
        })
        .catch((err: AxiosError<any>) => {
            setUser(defaultUser);
        });
    };

    return [user, loadUser];
}

export default useUser;