import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import EmployeeNavbar from "../../components/EmployeeSidebarNavbar/EmployeeNavbar";
import EmployeeSidebar from "../../components/EmployeeSidebar/EmployeeSidebar";

import "./EmployeeLayout.css";

function EmployeeLayout() {

    const [isSidebarCollapsed, setIsSidebarCollapsed] =
        useState(false);

    const [isDarkMode, setIsDarkMode] =
        useState(false);

    const [palette, setPalette] = useState(() =>
        localStorage.getItem("stockplan-employee-palette") || "azure-soft"
    );


    useEffect(() => {

        const savedTheme =
            localStorage.getItem("stockplan-theme");

        if (savedTheme === "dark") {
            setIsDarkMode(true);
        }

    }, []);


    useEffect(() => {

        document.body.classList.toggle(
            "employee-dark-mode",
            isDarkMode
        );

        localStorage.setItem(
            "stockplan-theme",
            isDarkMode ? "dark" : "light"
        );

        return () => {
            document.body.classList.remove("employee-dark-mode");
        };

    }, [isDarkMode]);

    useEffect(() => {
        localStorage.setItem("stockplan-employee-palette", palette);
    }, [palette]);


    const handleToggleSidebar = () => {

        setIsSidebarCollapsed(
            (previousState) => !previousState
        );

    };


    const handleToggleDarkMode = () => {

        setIsDarkMode(
            (previousState) => !previousState
        );

    };


    return (
        <div
            className={`employee-layout ${
                isDarkMode
                    ? "employee-layout--dark"
                    : ""
            }`}
            data-palette={palette}
        >

            <EmployeeNavbar
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={handleToggleSidebar}
                isDarkMode={isDarkMode}
                onToggleDarkMode={handleToggleDarkMode}
                palette={palette}
                onChangePalette={setPalette}
            />


            <div className="employee-layout__body">

                <EmployeeSidebar
                    isCollapsed={isSidebarCollapsed}
                />


                <main className="employee-layout__content">

                    <Outlet />

                </main>

            </div>

        </div>
    );
}

export default EmployeeLayout;