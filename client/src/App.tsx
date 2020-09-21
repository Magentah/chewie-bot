import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";

class App extends Component {
    public render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                    <p>Should change this.</p>
                    <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
                        Learn React
                    </a>
                    <a class-name="App-link" href="/auth/twitch">
                        Connect to Twitch
                    </a>
                </header>
            </div>
        );
    }
}

export default App;
