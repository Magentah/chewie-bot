import React from "react";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import CssBaseLine from "@material-ui/core/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import Login from "./views/login/Login";
import axios from "axios";

// initialize brand icons
library.add(fab);

const App: React.FC<{}> = (props) => {
    return (
        <Router>
            <CssBaseLine />
            <Switch>
                <Route path="/login">
                    <Login />
                </Route>
                <Route path="/">
                    <Dashboard />
                </Route>
            </Switch>
        </Router>
    );
};

export default App;
