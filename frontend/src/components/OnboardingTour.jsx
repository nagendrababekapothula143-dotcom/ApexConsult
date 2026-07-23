import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const OnboardingTour = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('hasSeenOnboardingTour', 'true');
    }
  };

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to Kryntel! 🎉</h2>
          <p className="text-slate-600">Let's take a quick tour to help you get started with finding your dream consulting role.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-jobs-feed',
      content: 'This is your Jobs Feed. Here you can browse active consulting opportunities and apply with one click.',
      placement: 'top',
    },
    {
      target: '.tour-sidebar-profile',
      content: 'Click here to update your profile. A complete profile increases your chances of getting noticed by recruiters!',
      placement: 'right',
    },
    {
      target: '.tour-theme-toggle',
      content: 'Prefer Dark Mode? Toggle your theme settings right here.',
      placement: 'bottom',
    },
  ];

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#4f46e5', // Indigo-600
          textColor: '#1e293b', // Slate-800
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#64748b',
        },
        buttonSkip: {
          color: '#64748b',
        },
      }}
    />
  );
};

export default OnboardingTour;
