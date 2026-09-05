import React from 'react';
import styled from 'styled-components';
import { email } from '@config';
import { useMagnetic, useSectionActivation, useReveal } from '@hooks';

const StyledContactSection = styled.section`
  max-width: 600px;
  margin: 0 auto 100px;
  text-align: center;

  @media (max-width: 768px) {
    margin: 0 auto 50px;
  }

  .title {
    font-size: clamp(40px, 5vw, 60px);
  }

  .email-link {
    ${({ theme }) => theme.mixins.bigButton};
    margin-top: 50px;
  }
`;

const Contact = () => {
  const ctaRef = useMagnetic();
  const { ref: sectionRef, step } = useSectionActivation('contact', 8);
  const titleRef = useReveal(step >= 1, 1.6);
  const bodyRef = useReveal(step >= 2, 0.8);
  const buttonRef = useReveal(step >= 3, 1.2);

  return (
    <StyledContactSection id="contact" ref={sectionRef}>
      <h2 className="title" ref={titleRef}>
        Get in touch
      </h2>

      <p ref={bodyRef}>
        I’m looking for new grad and internship roles, and I’m happy to talk about anything here. My
        inbox is open.
      </p>

      <span ref={buttonRef}>
        <a ref={ctaRef} className="email-link" href={`mailto:${email}`}>
          Email me
        </a>
      </span>
    </StyledContactSection>
  );
};

export default Contact;
