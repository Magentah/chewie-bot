import React from "react";
import Paper from "@mui/material/Paper";
import { UserProfile } from "../common/userProfile";
import MaterialTable from "@material-table/core";

const UserStatusLog: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const dateFormatShort = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });

    return <MaterialTable
        columns = {[
            { title: "Date", field: "time", width: "10%", render: rowData => <div style={{minWidth: "9em"}}>{dateFormatShort.format(new Date(rowData.time))}</div> },
            { title: "Event", field: "event", width: "10%", render: rowData => <div style={{minWidth: "9em"}}>{rowData.event}</div> },
            { title: "Details", field: "info", }
        ]}
        options = {{
            paging: true,
            showTitle: false,
            pageSize: 20,
            pageSizeOptions: [10, 20, 50, 100, 200],
            padding: "dense"
        }}
        data = {profile.goldLogs}
        components={{
            Container: p => <Paper {...p} elevation={0} />
        }}
    />;
}

export default UserStatusLog;
