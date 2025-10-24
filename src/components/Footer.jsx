import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row>
          <Col md={6}>
            <h5>Global Tourism Trend & Risk Analyzer</h5>
            <p className="mb-0">
              Analyze, Compare, and Explore Indian Tourism Smartly.
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <h6>Contact</h6>
            <p className="mb-0">
              Email: support@tourismanalyzer.com<br />
              Phone: +91 9876543210
            </p>
          </Col>
        </Row>
        <hr className="my-4" style={{ borderColor: '#6c757d' }} />
        <Row>
          <Col className="text-center">
            <p className="mb-0">
              &copy; 2025 Tourism Trend & Risk Analyzer. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
