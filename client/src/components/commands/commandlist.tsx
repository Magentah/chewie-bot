import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";
import { Grid, TextField, Button, CircularProgress, Box, Card, Accordion, AccordionSummary, Typography, AccordionDetails, Icon } from "@material-ui/core";
import { AddToListState } from "../common/addToListState";

const useStyles = makeStyles((theme) => ({
    addButton: {
        margin: theme.spacing(2, 0, 2),
    },
}));

const CommandList: React.FC<any> = (props: any) => {
    type RowData = { id: number, commandName: string, message: string, minimumModLevel: number;};

    const classes = useStyles();
    const [commandlist, setCommandlist] = useState([] as RowData[]);
    const [user, loadUser] = useUser();

    useEffect(loadUser, []);

    useEffect(() => {
        axios.get("/api/commandlist").then((response) => {
            setCommandlist(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                columns = {[
                    { title: "Command", field: "commandName", defaultSort: "asc" },
                    { title: "Content", field: "message" },
                    { title: "Required permissions", field: "minimumModLevel" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 3,
                    showTitle: false
                }}
                data = {commandlist}
                editable = {(user.userLevelKey < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => true,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/commandlist", newData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...commandlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newList[index] = newData;
                                setCommandlist(newList);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/commandlist/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newList = [...commandlist];
                                // @ts-ignore
                                const index = oldData?.tableData.id;
                                newList.splice(index, 1);
                                setCommandlist(newList);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default CommandList;