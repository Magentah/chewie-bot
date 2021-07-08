import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";
import { UserLevel } from "../common/userLevel";
import { Grid } from "@material-ui/core";
import { Launch, Chat, Settings } from "@material-ui/icons";

enum CommandType {
    Text,
    Alias,
    System
}

type RowData = { id: number, commandName: string, content: string, type: CommandType, minUserLevel: number, useCount: number, useCooldown: boolean };

const CommandNameCell: React.FC<any> = (value: RowData) => {
    let icon = <Settings />;
    if (value.type === CommandType.Text) {
        icon = <Chat />;
    } else if (value.type === CommandType.Alias) {
        icon = <Launch />;
    }

    return <Grid container alignItems="center" spacing={1}>
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
    const [user, loadUser] = useUser();

    useEffect(loadUser, []);

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
                        editable: (columnDef: any, rowData: RowData) => rowData?.type === CommandType.Text
                    },
                    { title: "Type", field: "type", editable: "onAdd", lookup: { 0: "Text", 1: "Alias", 2: "System" }, defaultFilter: ["0", "1"] },
                    { title: "Required permissions", field: "minUserLevel", editable: "never", lookup: Object.fromEntries(userLevels.map(e => [e.rank, e.name])) }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 6,
                    showTitle: false,
                    filtering: true,
                    addRowPosition: "first"
                }}
                data = {commandlist}
                editable = {(user.userLevelKey < UserLevels.Moderator) ? undefined :
                    {
                        isEditable: rowData => rowData.type !== CommandType.System,
                        isDeletable: rowData => rowData.type !== CommandType.System,
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