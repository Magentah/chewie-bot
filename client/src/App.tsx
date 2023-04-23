import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import CssBaseLine from "@mui/material/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import CurrentSong from "./components/songqueue/CurrentSong";
import Alert from "./components/twitch/Alert";

import axios from "axios";
import UserContextProvider from "./contexts/userContext";
import { ThemeProvider } from "@mui/material/styles";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { theme } from "./defaultTheme";

const muiCache = createCache({
    key: "mui", // all material ui classes start with 'css' instead of 'mui' even with this here
    prepend: true,
});

const App: React.FC<{}> = (props) => {
    const [isLoaded, setIsLoaded] = useState(false);

    // Wait until user profile cookie has been created.
    useEffect(() => {
        axios
            .get("/api/isloggedin")
            .then((response) => {
                setIsLoaded(true);
            })
            .catch((reason) => {
                setIsLoaded(true);
            });
    }, []);

    if (!isLoaded) {
        return null;
    }

    return (
        <Router>
            <CacheProvider value={muiCache}>
                <ThemeProvider theme={theme}>
                    <CssBaseLine />
                    <UserContextProvider>
                        <Routes>
                            <Route path="/currentsong" element={<CurrentSong/>} />
                            <Route path="/currentsong/details" element={<CurrentSong useDetails />} />
                            <Route path="/alerts/:timeout" element={<Alert />} />
                            <Route path="*" element={<Dashboard />} />
                        </Routes>
                    </UserContextProvider>
                </ThemeProvider>
            </CacheProvider>
        </Router>
    );
};

export default App;
