import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import { UserLevel } from "../common/userLevel";
import { Grid } from "@material-ui/core";
import { Launch, Chat, Settings } from "@material-ui/icons";
import { UserContext, UserLevels } from "../../contexts/userContext";

enum CommandType {
    Text,
    Alias,
    System
}

type RowData = { id?: number, commandName: string, content: string, type: CommandType, minUserLevel: number, useCount: number, useCooldown: boolean };

const CommandNameCell: React.FC<any> = (value: RowData) => {
    let icon = <Settings />;
    if (value.type === CommandType.Text) {
        icon = <Chat />;
    } else if (value.type === CommandType.Alias) {
        icon = <Launch />;
    }

    return <Grid container alignItems="center" spacing={1} wrap={"nowrap"}>
        <Grid item>
            {icon}
        </Grid>
        <Grid item>
            {value.commandName}
        </Grid>
    </Grid>
}

const CommandList: React.FC<any> = (props: any) => {
    const [commandlist, setCommandlist] = useState([] as RowData[]);
    const [userLevels, setUserLevels] = useState([] as UserLevel[]);
    const userContext = useContext(UserContext);

    useEffect(() => {
        axios.get("/api/commandlist").then((response) => {
            setCommandlist(response.data);
        });
    }, []);

    useEffect(() => {
        axios.get("/api/userLevels").then((response) => {
            setUserLevels(response.data);
        });
    }, []);

    return <div>
            <MaterialTable
                columns = {[
                    {
                        title: "Command", field: "commandName", defaultSort: "asc", filtering: false,
                        render: rowData => CommandNameCell(rowData),
                        validate: rowData => rowData.commandName !== "" && commandlist.filter(x => x.commandName === rowData.commandName && x.type === rowData.type && x.id !== rowData.id).length === 0
                    },
                    { title: "Content", field: "content", filtering: false },
                    { title: "Use count", field: "useCount", filtering: false, type: "numeric" },
                    {
                        title: "Has cooldown", field: "useCooldown", filtering: true, type: "boolean",
                        editable: (columnDef: any, rowData: RowData) => rowData?.type === CommandType.Text,
                        width: "10%"
                    },
                    { title: "Type", field: "type", editable: "onAdd", lookup: { 0: "Text", 1: "Alias", 2: "System" }, defaultFilter: ["0", "1"], initialEditValue: 0 },
                    { title: "Required permissions", field: "minUserLevel", editable: "never", lookup: Object.fromEntries(userLevels.map(e => [e.rank, e.name])) }
                ]}
                options = {{
                    paging: true,
                    pageSize: 50,
                    pageSizeOptions: [50, 100, 200],
                    actionsColumnIndex: 6,
                    showTitle: false,
                    filtering: true,
                    addRowPosition: "first"
                }}
                data = {commandlist}
                editable = {(userContext.user.userLevel < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => rowData.type !== CommandType.System,
                        isDeletable: rowData => rowData.type !== CommandType.System,
                        onRowAdd: (newData) => {
                            const command: RowData = {
                                commandName: newData.commandName,
                                content: newData.content,
                                // Material-table changes datatype to string after selecting from the dropdown for no apparent reason.
                                type: parseInt(newData.type.toString(), 10),
                                minUserLevel: 0,
                                useCount: newData.useCount,
                                useCooldown: true
                            };
                            return axios.post("/api/commandlist/add", command).then((result) => {
                                const newList = [...commandlist, result.data as RowData];
                                setCommandlist(newList);
                            })
                        },
                        onRowUpdate: (newData, oldData) => axios.post("/api/commandlist", newData).then((result) => {
                            const newList = [...commandlist];
                            // @ts-ignore
                            const index = oldData?.tableData.id;
                            newList[index] = newData;
                            setCommandlist(newList);
                        }),
                        onRowDelete: oldData => axios.post("/api/commandlist/delete", oldData).then((result) => {
                            const newList = [...commandlist];
                            // @ts-ignore
                            const index = oldData?.tableData.id;
                            newList.splice(index, 1);
                            setCommandlist(newList);
                        })
                    }
                }
            />
    </div>;
};

export default CommandList;