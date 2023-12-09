import React, { useEffect, useMemo, useState } from "react";
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
import { PaletteMode, createTheme } from "@mui/material";
import { ColorModeContext, getDesignTokens } from "defaultTheme";

import Cookies from "js-cookie";

const muiCache = createCache({
    key: "mui", // all material ui classes start with 'css' instead of 'mui' even with this here
    prepend: true,
});

const App: React.FC<{}> = (props) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [mode, setMode] = React.useState<PaletteMode>("light");

    const colorMode = React.useMemo(
        () => ({
          toggleColorMode: () => {
            setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
          },
        }),
        [],
    );
    
    // Wait until user profile cookie has been created.
    useEffect(() => {
        setMode(Cookies.get("palette_mode") === "dark" ? "dark" : "light");

        axios.get("/api/isloggedin")
            .then((response) => {
                setIsLoaded(true);
            })
            .catch((reason) => {
                setIsLoaded(true);
            });
    }, []);

    useEffect(() => {
        // Save color mode to cookie when mode changes
        Cookies.set('palette_mode', mode, { expires: 365 });
    }, [mode]);

    const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

    if (!isLoaded) {
        return null;
    }

    // Update the theme only if the mode changes
    return (
        <Router>
            <CacheProvider value={muiCache}>
                <ColorModeContext.Provider value={colorMode}>
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
                </ColorModeContext.Provider>
            </CacheProvider>
        </Router>
    );
};

export default App;
