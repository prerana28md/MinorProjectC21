// components/NewsHeadlines.jsx (or NewsChart.jsx)

import React, { useState } from "react";
import { Card, ListGroup, Button, Collapse, Badge, Row, Col } from 'react-bootstrap';

// Helper function for sentiment color
const getSentimentColor = (sentiment) => {
    switch (String(sentiment).toLowerCase()) {
        case 'positive':
            return 'success';
        case 'negative':
            return 'danger';
        case 'neutral':
            return 'secondary';
        default:
            return 'info';
    }
};

const NewsChart = ({ articles, title }) => {
    // State to track which article's description is currently open
    const [openIndex, setOpenIndex] = useState(null);

    if (!articles || articles.length === 0) {
        return (
            <div className="card shadow p-3 text-center">
                <Card.Title>Recent News</Card.Title>
                <p className="text-muted mb-0">No recent news found for this location.</p>
            </div>
        );
    }

    const getFormattedDate = (article) => {
        const dateValue = article.publishedAt || article.published_at || article.date || article.published;
        if (dateValue) {
            try {
                return new Date(dateValue).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (e) {
                // If date is invalid but present, return an empty string instead of N/A
                return ''; 
            }
        }
        return ''; // Return empty string if no date field is found
    };

    const getSource = (article) => {
        // Return the source name or an empty string if not found
        return article.source?.name || article.source || '';
    };
    
    // Normalize sentiment to ensure it is only displayed if it's one of the expected values
    const getSentiment = (article) => {
        const sentiment = String(article.sentiment).toLowerCase();
        if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
            return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
        }
        return null; // Return null if sentiment is not valid
    };

    return (
        <Card className="shadow h-100">
            <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                    <i className="fas fa-newspaper me-2"></i>
                    {/* Ensure only the actual title remains */}
                    {title.replace(/ - Article Count Over Time$/, '')} ({articles.length} Headlines)
                </h5>
            </Card.Header>
            
            <Card.Body className="p-0">
                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <ListGroup variant="flush">
                        {articles.map((article, index) => {
                            const formattedDate = getFormattedDate(article);
                            const source = getSource(article);
                            const sentiment = getSentiment(article);

                            return (
                                <ListGroup.Item key={index} className="py-2 px-3">
                                    <Row className="align-items-center">
                                        {/* Headline and Metadata Column */}
                                        <Col xs={10}>
                                            <div className="fw-bold mb-1" style={{ fontSize: '1em' }}>
                                                {article.title}
                                            </div>
                                            <small className="text-muted d-block">
                                                {formattedDate} 
                                                {formattedDate && source && ' - '}
                                                {source && `Source: ${source}`}
                                            </small>
                                        </Col>
                                        
                                        {/* Action Column (Sentiment & Button) */}
                                        <Col xs={2} className="text-end">
                                            <div className="mb-1">
                                                {/* Only display Badge if sentiment is recognized */}
                                                {sentiment && (
                                                    <Badge bg={getSentimentColor(sentiment)} pill>
                                                        {sentiment}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                                aria-controls={`description-collapse-${index}`}
                                                aria-expanded={openIndex === index}
                                                variant="outline-primary"
                                                size="sm"
                                            >
                                                {openIndex === index ? 'Hide' : 'Details'}
                                            </Button>
                                        </Col>
                                    </Row>

                                    {/* Description Collapse */}
                                    <Collapse in={openIndex === index}>
                                        <div id={`description-collapse-${index}`} className="mt-2 p-2 border-top">
                                            <p className="mb-1" style={{ fontSize: '0.9em' }}>
                                                {article.description || article.summary || 'No detailed description available for this article.'}
                                            </p>
                                            {article.url && (
                                                <Button 
                                                    href={article.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    variant="link" 
                                                    className="p-0"
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    Read full article
                                                </Button>
                                            )}
                                        </div>
                                    </Collapse>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </div>
            </Card.Body>
        </Card>
    );
};

export default NewsChart;