import React, { createContext, useState, useEffect, useMemo } from "react";
import { useContextFactory } from "./contextFactory";
import cookie from "js-cookie";

const UserContext = createContext({});

export const useUserContext = useContextFactory("UserContext", UserContext);

const UseContextProvider = (props: any) => {
    const [user, setUser] = useState<any>();
    const value = useMemo(
        () => ({
            user,
            setUser,
        }),
        [user]
    );

    useEffect(() => {
        const ck = cookie.get("user");
        if (ck !== undefined) {
            const cookieUser = JSON.parse(ck);
            setUser(cookieUser);
        }
    }, []);

    return <UserContext.Provider value={value}>{props.children}</UserContext.Provider>;
};

export default UseContextProvider;
