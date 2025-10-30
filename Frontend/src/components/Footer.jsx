import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row>
          <Col className="text-center" >
            <h5>Domestic Tourism Trend & Risk Analyzer</h5>
            <p className="mb-0">
              Analyze, Compare, and Explore Indian Tourism Smartly.
            </p>
          </Col>
            {/* <h6>Contact</h6> */}
            {/* <p className="mb-0">
              Email: support@tourismanalyzer.com<br />
              Phone: +91 9876543210
            </p> */}

        </Row>
        <hr className="my-4" style={{ borderColor: '#c4c8ccff' }} />
        <Row>
          <Col className="text-center">
            <p className="mb-0" style={{ color: '#b9bdc3ff' }}>
              &copy; 2025 Tourism Trend & Risk Analyzer. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
