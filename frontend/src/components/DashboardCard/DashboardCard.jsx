function DashboardCard({
    title,
    value,
    icon: Icon,
    description
}) {

    return (
        <article className="dashboard-card">

            <div className="dashboard-card__top">

                <div className="dashboard-card__icon">
                    <Icon size={21} />
                </div>

                <span className="dashboard-card__title">
                    {title}
                </span>

            </div>


            <div className="dashboard-card__value">
                {value}
            </div>


            {description && (
                <p className="dashboard-card__description">
                    {description}
                </p>
            )}

        </article>
    );
}

export default DashboardCard;