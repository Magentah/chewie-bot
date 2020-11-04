import React, { useEffect, useState } from "react";
import { HashRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import CssBaseLine from "@material-ui/core/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import Login from "./views/login/Login";
import axios from "axios";
import UserContextProvider from "./contexts/userContext";

// initialize brand icons
library.add(fab);

const App: React.FC<{}> = (props) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [user, setUser] = useState<any>();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        axios
            .get("/api/isloggedin")
            .then((response) => {
                if (response.status === 200) {
                    setUser(response.data);
                    setIsLoggedIn(true);
                    setIsLoaded(true);
                } else {
                    setIsLoaded(true);
                    setIsLoggedIn(false);
                }
            })
            .catch((reason) => {
                setIsLoaded(true);
                setIsLoggedIn(false);
            });
    }, []);

    if (!isLoaded) {
        return null;
    }
    return (
        <Router>
            <CssBaseLine />
            <Switch>
                <Route path="/login">
                    <Login />
                </Route>
                <UserContextProvider>
                    <Route path="/">{isLoggedIn ? <Dashboard /> : <Redirect to="/login" />}</Route>
                </UserContextProvider>
            </Switch>
        </Router>
    );
};

export default App;
