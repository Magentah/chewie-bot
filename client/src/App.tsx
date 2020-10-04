<<<<<<< HEAD
import React from "react";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import CssBaseLine from "@material-ui/core/CssBaseline";

import Dashboard from "./views/dashboard/Dashboard";
import Login from "./views/login/Login";

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
=======
import React, { Component } from "react";
import axios, { AxiosRequestConfig } from "axios";
import logo from "./logo.svg";
import "./App.css";

interface AppProps {}

interface AppState {
    user: any;
}

class App extends Component<AppProps, AppState> {
    constructor(props: any) {
        super(props);
        this.state = { user: undefined };
        this.message = this.message.bind(this);
    }
    async componentDidMount() {
        const response = await axios.get("/api/isloggedin", { withCredentials: true });
        if (response.status === 200) {
            this.setState({ user: response.data });
        } else if (response.status === 403) {
            //
        }
    }
    public message(): JSX.Element {
        if (!this.state.user) {
            return <p>No user logged in.</p>;
        } else {
            return (
                <p>
                    Logged in to Twitch.tv {this.state.user.streamlabsToken ? "and Streamlabs" : ""} as{" "}
                    {this.state.user.username}.
                </p>
            );
        }
    }

    public streamlabsLogin(): any {
        const params: AxiosRequestConfig = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "http://localhost",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
                "Access-Control-Allow-Headers": "X-Requested-With,content-type",
                "Access-Control-Allow-Credentials": true,
            },
            withCredentials: true,
            data: undefined,
        };
        axios.get("/api/auth/streamlabs", params);
    }

    public render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                    <this.message />
                    <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
                        Learn React
                    </a>
                    <a class-name="App-link" href="/api/auth/twitch">
                        Connect to Twitch
                    </a>
                    <a class-name="App-link" href="/api/auth/streamlabs">
                        Connect to Streamlabs
                    </a>
                    <a class-name="App-link" href="/api/logout">
                        Logout
                    </a>
                </header>
            </div>
        );
    }
}
>>>>>>> upstream/master

export default App;
