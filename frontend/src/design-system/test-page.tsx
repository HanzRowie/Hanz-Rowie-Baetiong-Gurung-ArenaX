import React, { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Modal } from './components';
import { AnimationProvider } from './animations';
import { AccessibilityProvider, FocusProvider, ScreenReaderProvider } from './accessibility';

const DesignSystemTestPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <AccessibilityProvider>
      <FocusProvider>
        <ScreenReaderProvider>
          <AnimationProvider>
            <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
              <h1 className="text-4xl font-bold text-center mb-8">Design System Test</h1>
              
              {/* Buttons */}
              <Card>
                <CardHeader>
                  <CardTitle>Buttons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="danger">Danger Button</Button>
                    <Button variant="success">Success Button</Button>
                    <Button loading>Loading Button</Button>
                    <Button role="player">Player Button</Button>
                    <Button role="organizer">Organizer Button</Button>
                    <Button role="referee">Referee Button</Button>
                    <Button role="venue_owner">Venue Owner Button</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card elevation="sm" interactive animation="hover-lift">
                  <CardHeader>
                    <CardTitle>Interactive Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This card has hover animations and is interactive.</p>
                  </CardContent>
                </Card>

                <Card gradient role="player">
                  <CardHeader>
                    <CardTitle>Player Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This card has a player-themed gradient.</p>
                  </CardContent>
                </Card>

                <Card blur elevation="lg">
                  <CardHeader>
                    <CardTitle>Glass Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This card has a glass morphism effect.</p>
                  </CardContent>
                </Card>

                <Card role="organizer" animation="hover-glow">
                  <CardHeader>
                    <CardTitle>Organizer Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>This card glows on hover with organizer colors.</p>
                  </CardContent>
                </Card>
              </div>

              {/* Inputs */}
              <Card>
                <CardHeader>
                  <CardTitle>Input Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Basic Input"
                      placeholder="Enter some text..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <Input
                      label="Input with Icon"
                      placeholder="Search..."
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                    />
                    <Input
                      label="Input with Validation"
                      placeholder="Enter email..."
                      validation={(value) => {
                        if (!value) return 'Email is required';
                        if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email format';
                        return null;
                      }}
                      realTimeValidation
                    />
                    <Input
                      label="Success State"
                      placeholder="Valid input"
                      success="This looks good!"
                      value="valid@example.com"
                      readOnly
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Modal */}
              <Card>
                <CardHeader>
                  <CardTitle>Modal Component</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                  <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="Test Modal"
                    description="This is a test modal with smooth animations and focus management."
                    animation="scale"
                  >
                    <div className="space-y-4">
                      <p>This modal demonstrates:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Focus trapping</li>
                        <li>Smooth animations</li>
                        <li>Keyboard navigation</li>
                        <li>Accessibility features</li>
                      </ul>
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setModalOpen(false)}>
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </Modal>
                </CardContent>
              </Card>
            </div>
          </AnimationProvider>
        </ScreenReaderProvider>
      </FocusProvider>
    </AccessibilityProvider>
  );
};

export default DesignSystemTestPage;