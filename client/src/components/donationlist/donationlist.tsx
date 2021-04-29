import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";
import { Grid, TextField, Button, CircularProgress, Box, Card, Accordion, AccordionSummary, Typography, AccordionDetails, Icon } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import AddIcon from "@material-ui/icons/Add";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { AddToListState } from "../common/addToListState";

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

const DonationList: React.FC<any> = (props: any) => {
    type RowData = {username: string, date: Date, amount: number, message: string};

    const classes = useStyles();
    const [donationlist, setDonationlist] = useState([] as RowData[]);
    const [user, loadUser] = useUser();

    useEffect(loadUser, []);

    useEffect(() => {
        axios.get("/api/donationlist").then((response) => {
            setDonationlist(response.data);
        });
    }, []);

    return <div>
            {/* {songrequestRules} */}
            <MaterialTable
                columns = {[
                    { title: "Username", field: "username" },
                    { title: "Date", field: "date", defaultGroupOrder: 0, defaultGroupSort: "desc" },
                    { title: "Message", field: "message" },
                    { title: "Amount", field: "amount" }
                ]}
                options = {{
                    paging: false,
                    grouping: true,
                    defaultExpanded: false,
                    showTitle: false
                }}
                data = {donationlist}
            />
    </div>;
};

export default DonationList;