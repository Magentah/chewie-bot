import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import CssBaseLine from "@material-ui/core/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import CurrentSong from "./components/songqueue/CurrentSong";
import Alert from "./components/twitch/Alert";

import axios from "axios";
import UserContextProvider from "./contexts/userContext";

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
            <CssBaseLine />
            <UserContextProvider>
                <Routes>
                    <Route path="/currentsong" element={<CurrentSong/>} />
                    <Route path="/alerts/:timeout" element={<Alert />} />
                    <Route path="*" element={<Dashboard />} />
                </Routes>
            </UserContextProvider>
        </Router>
    );
};

export default App;
