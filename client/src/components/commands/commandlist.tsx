import React, { useEffect, useState } from "react";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";

enum CommandType {
    Text,
    Alias,
    System
}

const CommandList: React.FC<any> = (props: any) => {
    type RowData = { id: number, commandName: string, content: string, type: CommandType, minUserLevelName: number };

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
                    {
                        title: "Command", field: "commandName", defaultSort: "asc", filtering: false,
                        validate: rowData => rowData.commandName !== "" && commandlist.filter(x => x.commandName === rowData.commandName && x.type === rowData.type && x.id !== rowData.id).length === 0
                    },
                    { title: "Type", field: "type", editable: "never", lookup: { 0: "Text", 1: "Alias", 2: "System" }, defaultFilter: ["0", "1"] },
                    { title: "Content", field: "content", filtering: false },
                    { title: "Required permissions", field: "minUserLevelName", editable: "never" }
                ]}
                options = {{
                    paging: false,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    filtering: true
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