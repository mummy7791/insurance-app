type Props = {
  title: string;
  subtitle?: string;
};

export default function Topbar({
  title,
  subtitle,
}: Props) {
  const user = JSON.parse(
    localStorage.getItem("insuranceUser") || "{}"
  );

  return (
    <div className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="user-box">
        <strong>{user.name}</strong>
        <br />
        <small>{user.role}</small>
      </div>
    </div>
  );
}