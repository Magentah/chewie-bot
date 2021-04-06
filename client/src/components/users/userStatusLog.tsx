import React from "react";
import Paper from "@material-ui/core/Paper";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@material-ui/core";
import { UserProfile } from "../common/userProfile";

const UserStatusLog: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const dateFormatShort = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });

    return <TableContainer component={Paper}>
        <Table >
            <TableHead>
                <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Details</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
            {profile.goldLogs.map((row: any) => (
                <TableRow key={row.name}>
                    <TableCell component="th" scope="row">
                        {dateFormatShort.format(new Date(row.time))}
                    </TableCell>
                    <TableCell>{row.event}</TableCell>
                    <TableCell>{row.info}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
    </TableContainer>;
}

export default UserStatusLog;
