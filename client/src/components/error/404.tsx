import React from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { Image } from "react-bootstrap";

const NotFound: React.FC<{}> = (props) => {
  return (
    <Card>
      <CardContent>
        <Grid container spacing={4} style={{ textAlign: "center" }}>
          <Grid item xs={12}>
            <Image
              src="/404.gif"
              width="20%"
              style={{ backgroundColor: "black" }}
              roundedCircle
            />
          </Grid>
          <Grid item xs={12}>
            <Typography>The page you are looking for does not exist</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default NotFound;
