import { createTheme } from "@mui/material/styles";

export const SidebarWidth = 230;

export const theme = createTheme({
    palette: {
        background: { default: "#FAFAFA" }
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#282c34",
                    color: "white",
                    width: `calc(100% - ${SidebarWidth}px)`,
                    marginLeft: SidebarWidth
                },
            },
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    textDecoration: "none",
                    "&:hover": {
                        textDecoration: "underline",
                    },
                }
            }
        },
        MuiSelect: {
            defaultProps: {
                variant: "standard"
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: "standard"
            },
        },
        MuiFormControl: {
            defaultProps: {
                variant: "standard"
            },
        },
        MuiAlert: {
            defaultProps: {
                variant: "filled",
                elevation: 6
            },
        },
        MuiSnackbar: {
            defaultProps: {
                anchorOrigin: { vertical: "bottom", horizontal: "center" }
            }
        }
    },
});

export default theme;