import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import CssBaseLine from "@material-ui/core/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import CurrentSong from "./components/songqueue/CurrentSong";
import Alert from "./components/twitch/Alert";

import axios from "axios";
import UserContextProvider from "./contexts/userContext";

// initialize brand icons
library.add(fab);

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
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link href="https://fonts.googleapis.com/css2?family=Cantora+One&display=swap" rel="stylesheet" /> 
            <UserContextProvider>
                <Switch>
                    <Route path="/currentsong/:size">
                        <CurrentSong />
                    </Route>
                    <Route path="/alerts/:timeout">
                        <Alert />
                    </Route>
                    <Route exact path="*">
                        <Dashboard />
                    </Route>
                </Switch>
            </UserContextProvider>
        </Router>
    );
};

export default App;
