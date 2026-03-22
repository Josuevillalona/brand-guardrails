import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Inline the HomeScreen component since it's defined inside page.tsx
// We test the key behaviours: heading, subtitle, CTA, carousel.
// page.tsx is a Next.js Client Component — import it directly.
import Home from "@/app/page";

// Mock the store so we control phase
jest.mock("@/store/useStore", () => {
  const setPhase = jest.fn();
  const store = {
    phase: "home" as const,
    brandKit: null,
    showBrandSetup: false,
    setShowBrandSetup: jest.fn(),
    setPhase,
  };
  const useStore = (selector?: (s: typeof store) => unknown) =>
    selector ? selector(store) : store;
  useStore.getState = () => store;
  return { useStore, __esModule: true };
});

describe("Home page — HomeScreen phase", () => {
  it('renders the headline "What will you create today?"', () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "What will you create today?"
    );
  });

  it('renders "create" as a highlighted span', () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    const highlight = heading.querySelector("span");
    expect(highlight).toHaveTextContent("create");
  });

  it("renders the subtitle", () => {
    render(<Home />);
    expect(
      screen.getByText(/Generate brand-aligned AI images/i)
    ).toBeInTheDocument();
  });

  it('renders the "Start designing" button', () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /Start designing/i })
    ).toBeInTheDocument();
  });

  it("calls setPhase(canvas) when Start designing is clicked", () => {
    const { useStore } = require("@/store/useStore");
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /Start designing/i }));
    expect(useStore.getState().setPhase).toHaveBeenCalledWith("canvas");
  });

  it("renders carousel images", () => {
    const { container } = render(<Home />);
    // alt="" makes them presentation role — query via DOM
    const images = container.querySelectorAll("img");
    // 11 images doubled = 22 img elements in the carousel
    expect(images.length).toBe(22);
  });

  it("carousel images have empty alt text for accessibility", () => {
    const { container } = render(<Home />);
    const images = container.querySelectorAll("img");
    images.forEach((img) => {
      expect(img).toHaveAttribute("alt", "");
    });
  });
});
