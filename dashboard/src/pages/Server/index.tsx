import { faCrown, faGear, faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Card, Col, Container, ListGroup, Row } from "react-bootstrap";
import { Link, Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import Loader from "shared/components/Loader";
import ServerCard from "shared/components/ServerCard";
import { useFetchUserServersQuery } from "store/api";
import StyledServer from "./styles";

const Server = () => {
  const { serverId } = useParams();
  const userServers = useFetchUserServersQuery();

  const redirectToDashboard = <Navigate to="/dashboard" replace={true} />;

  if (userServers.isFetching) return <Loader />;
  if (!userServers.data) return redirectToDashboard;

  const server = userServers.data.find((s) => s.id === serverId);
  if (!server || !server.bot) return redirectToDashboard;
  if (!server.owner && !server.admin) return redirectToDashboard;

  return (
    <StyledServer>
      <Container fluid className="py-3">
        <Row className="g-3">
          <Col md={4}>
            <ServerCard server={server}>
              <div className="d-flex justify-content-end">
                <Link to="/dashboard">
                  <Button variant="secondary">Change Server</Button>
                </Link>
              </div>
            </ServerCard>
            <Card className="mt-3">
              <ListGroup>
                <NavLink to="settings" className="list-group-item">
                  <FontAwesomeIcon icon={faGear} className="menu-icon" />
                  <span>Settings</span>
                </NavLink>
                <NavLink to="track" className="list-group-item">
                  <FontAwesomeIcon icon={faList} className="menu-icon" />
                  <span>Tracking List</span>
                </NavLink>
                <NavLink to="subscription" className="list-group-item">
                  <FontAwesomeIcon icon={faCrown} className="menu-icon" />
                  <span>Subscription</span>
                </NavLink>
              </ListGroup>
            </Card>
          </Col>
          <Col md={8}>
            <Card>
              <Outlet />
            </Card>
          </Col>
        </Row>
      </Container>
    </StyledServer>
  );
};

export default Server;