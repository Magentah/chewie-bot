import React, { useContext } from "react";

/* eslint-disable */
export const useContextFactory = (name: string, context: React.Context<any>): React.FC<React.Context<any>> => {
    return () => {
        const ctx = useContext(context);
        if (ctx === undefined) {
            throw new Error(`use${name}Context must be used within a ${name}ContextProvider`);
        }
        return ctx;
    };
};
/* eslint-enable */
