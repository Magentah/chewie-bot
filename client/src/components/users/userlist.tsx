import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import MaterialTable from "material-table"
import useUser, { UserLevels } from "../../hooks/user";

type RowData = {username: string, vipExpiry: number, vipLastRequest: number};
type UserLevel = { id: number; name: string; }

const VipStatusCell: React.FC<any> = (value: RowData) => {
    const todayDate = new Date(new Date().toDateString());
    let vipInfo = "";
    let lastRequest = "";
    if (value.vipExpiry) {
        if (new Date(value.vipExpiry) < todayDate) {
            vipInfo = "Expired: " + new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(value.vipExpiry));
        } else {
            vipInfo = "Expiry: " + new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" }).format(new Date(value.vipExpiry));
        }

        lastRequest = "Last request: " + (value?.vipLastRequest ? new Date(value?.vipLastRequest).toDateString() : "-");
    }

    return (
        <div>
            {vipInfo}<br />
            {lastRequest}
        </div>
    );
};

const UserList: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);
    const [userLevels, setUserLevels] = useState([] as UserLevel[]);

    useEffect(() => {
        axios.get("/api/userlist").then((response) => {
            setUserlist(response.data);
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
                    { title: "User name", field: "username" },
                    { title: "User level", field: "userLevelKey", lookup: Object.fromEntries(userLevels.map(e => [e.id, e.name])) },
                    {
                        title: "VIP status",
                        field: "vipExpiry",
                        render: rowData => VipStatusCell(rowData)
                    },
                    { title: "Points", field: "points", cellStyle: { textAlign: "right" }, headerStyle: { textAlign: "right" } }
                ]}
                options = {{
                    paging: true,
                    actionsColumnIndex: 4,
                    showTitle: false,
                    pageSize: 50,
                    pageSizeOptions: [50, 100, 200]
                }}
                actions={[
                    {
                      icon: 'content_copy',
                      tooltip: 'Copy to clipboard',
                      onClick: (event, rowData) => {
                        if ((rowData as RowData).username !== undefined) {
                            
                        }
                      }
                    }
                ]}
                data = {userlist}
                editable = {
                    {
                        // Allow edit when user levels are loaded.
                        isEditable: rowData => userLevels.length > 0,
                        isDeletable: rowData => true,
                        onRowUpdate: (newData, oldData) => axios.post("/api/userlist", newData).then((result) => {
                            if (result.status === 200) {
                                const newSonglist = [...userlist];
                                //@ts-ignore
                                const index = oldData?.tableData.id;
                                newSonglist[index] = newData;
                                setUserlist(newSonglist);
                            }
                        }),
                        onRowDelete: oldData => axios.post("/api/userlist/delete", oldData).then((result) => {
                            if (result.status === 200) {
                                const newSonglist = [...userlist];
                                //@ts-ignore
                                const index = oldData?.tableData.id;
                                newSonglist.splice(index, 1);
                                setUserlist(newSonglist);
                            }
                        })
                    }
                }
            />
    </div>;
};

export default UserList;