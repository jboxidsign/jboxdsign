/**
 * All page copy lives here so content updates never touch layout code.
 * Text is taken from the approved Figma design ("Design 1: Minimal and Direct").
 * Items marked `placeholder: true` are still waiting on the client.
 */

export const company = {
  name: "JBOX iDsign LLC",
  legalName: "JBOX iDsign LLC",
  tagline: "Design & Permitting + Construction",
  established: 2018,
  phone: "925-759-6847",
  phoneHref: "tel:+19257596847",
  email: "Info@jboxidsign.com",
  address: {
    street: "4128 Business Center Dr.",
    city: "Fremont",
    region: "CA",
    postalCode: "94538",
    country: "US",
  },
  location: "Fremont, CA",
  locationLong: "Fremont, California",
  principal: {
    name: "Julius Ken Bacinillo",
    role: "CEO / Principal Designer",
    photo: "/images/principal-julius.jpg",
    bio: null as string | null, // placeholder: short bio to be supplied by the client
  },
} as const;

/** Years of experience, counted from the founding year. */
export function yearsOfExperience(now: Date = new Date(), established: number = company.established): number {
  return Math.max(0, now.getFullYear() - established);
}

export const primaryCta = "Let’s Discuss Your Project";

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export const hero = {
  eyebrow: ["JBOX iDsign LLC", "Fremont, CA"],
  titleLines: ["Thoughtfully Designed.", "Personally Understood."],
  body: "Your vision deserves more than a generated design. Turn your vision into reality through thoughtful design, personalized service, and seamless permitting support.",
  image: "/images/hero-residence.jpg",
  imageAlt: "3D rendering of a modern two-storey residence with wood and stone cladding above landscaped terraces",
};

export type Service = {
  id: string;
  title: string;
  body: string[];
  image?: { src: string; alt: string; contain?: boolean };
  placeholder?: { title: string; note: string };
};

export const services: { title: string; intro: string; items: Service[] } = {
  title: "Our Services",
  intro: "We bring your ideas to life—from concept to completion!",
  items: [
    {
      id: "as-built",
      title: "As-Built Plans",
      body: [
        "Accurate documentation of existing structures using Polycam scanning technology and actual site conditions. We capture your property's current layout and dimensions through 3D scanning, transforming real-world spaces into reliable digital models and detailed plans for renovations, remodeling, permitting, and future improvements.",
      ],
      placeholder: { title: "Polycam scans & existing conditions", note: "To be provided" },
    },
    {
      id: "planning",
      title: "2D & 3D Planning & Design",
      body: [
        "From existing spaces to envisioned designs, we bring your ideas to life with clarity, creativity, and purpose.",
        "See your ideas take shape before construction begins. Through 3D models, realistic renderings, and walkthroughs, we help you understand the proposed design, explore different possibilities, and make more confident decisions about your space.",
      ],
      image: { src: "/images/service-planning.jpg", alt: "3D rendering of a white home with a new wooden deck and staircase" },
    },
    {
      id: "permitting",
      title: "Permitting",
      body: [
        "Getting a project ready for construction involves more than preparing drawings. We assist with permit document preparation and submission, review applicable building and zoning requirements during planning, and coordinate with the appropriate city departments throughout the permitting process. Our goal is to help make the requirements easier to understand and the process more organized.",
      ],
      image: { src: "/images/service-permitting.jpg", alt: "Sample city plan-check correction table used during permitting", contain: true },
    },
    {
      id: "bim",
      title: "BIM",
      body: [
        "We provide intelligent 3D modeling and coordinated building information to improve project accuracy, efficiency, and collaboration. Through detailed BIM models, we help visualize building systems, identify potential conflicts, and streamline the design and construction process—from planning and development to project coordination.",
      ],
      placeholder: { title: "Revit BIM screenshot", note: "To be provided" },
    },
  ],
};

export type Project = {
  id: string;
  tag: string;
  title: string;
  body: string;
  cta: string;
  projectType: ProjectType;
  image: string;
  alt: string;
};

export const projects: { title: string; intro: string; items: Project[] } = {
  title: "Our Projects",
  intro: "From a single room to a new living space, planned around how you live.",
  items: [
    {
      id: "kitchen",
      tag: "Kitchen",
      title: "Kitchen Remodeling",
      body: "A well-designed kitchen should make everyday tasks easier while creating a space where family and friends can come together.",
      cta: "Discuss a kitchen project",
      projectType: "Kitchen Remodeling",
      image: "/images/project-kitchen.jpg",
      alt: "Rendering of a white galley kitchen seen through an arched opening",
    },
    {
      id: "bathroom",
      tag: "Bathroom",
      title: "Bathroom Remodeling",
      body: "A bathroom that feels just right for you: comfortable, refreshing, and designed around your daily routine.",
      cta: "Discuss a bathroom project",
      projectType: "Bathroom Remodeling",
      image: "/images/project-bathroom.jpg",
      alt: "Rendering of a bright bathroom with a glass shower and white vanity",
    },
    {
      id: "adu",
      tag: "ADU and Addition",
      title: "ADU & Home Addition",
      body: "Create room for family, guests, or potential rental income while making better use of your property.",
      cta: "Discuss an ADU or addition",
      projectType: "ADU & Home Addition",
      image: "/images/project-adu.jpg",
      alt: "Rendering of a hillside accessory dwelling unit with a wood-clad base and terraced garden",
    },
    {
      id: "exterior",
      tag: "Exterior",
      title: "Exterior Remodeling & Outdoor Living",
      body: "Your outdoor space can be more than an empty yard or patio: a welcoming place to relax, spend time with family, or entertain friends.",
      cta: "Discuss an outdoor project",
      projectType: "Exterior Remodeling & Outdoor Living",
      image: "/images/project-exterior.jpg",
      alt: "Rendering of a modern residence with concrete planters and a lawn",
    },
  ],
};

export const why = {
  title: "Why Choose Us",
  intro: "By addressing these details early and guiding you through each step, we help make the process easier to navigate.",
  items: [
    {
      title: "Thoughtful Design and Planning",
      body: "Every great space begins with a vision. We work closely with you to understand your needs, preferences, and goals, translating your ideas into thoughtful, functional, and well-planned designs.",
    },
    {
      title: "Visualization before construction",
      body: "Through realistic 3D renderings and visual presentations, we help you explore the design, understand the space, and make informed decisions with confidence.",
    },
    {
      title: "Code Compliant Design",
      body: "We develop designs with applicable building codes, zoning regulations, and permitting requirements in mind. Our goal is to create functional, safe, and well-planned spaces that align with regulatory standards while respecting your vision and project needs.",
    },
    {
      title: "Services Shaped by Human Understanding",
      body: "Our services combine technology, creativity, and human expertise to bring your vision to life. We listen, understand, and design with purpose—providing personalized solutions from concept to completion.",
    },
    {
      title: "Coordinated with experienced professionals",
      body: "We collaborate with engineers, consultants, and builders to ensure your design is properly coordinated and aligned with project requirements. Through clear communication and organized documentation, we help minimize conflicts, streamline the construction process, and bring your vision to life efficiently.",
    },
  ],
};

export const about = {
  titleLines: ["A well-designed project", "starts with careful", "planning."],
  body: [
    "Established in 2018, JBOX iDsign LLC helps homeowners turn their ideas into thoughtfully designed, functional spaces. We specialize in residential remodeling, renovations, home additions, and ADUs.",
    "We believe good design goes beyond appearance. It should work for the people who use the space, make the most of the property, and account for applicable requirements from the beginning.",
  ],
};

export const closingCta = {
  title: "Have a project in mind?",
  body: "Let's discuss how we can help you move forward.",
  image: "/images/cta-facade.jpg",
};

export const contact = {
  title: "Let’s Discuss Your Project",
  intro: "Share a few details about your project and we'll be in touch.",
};

export const projectTypes = [
  "Kitchen Remodeling",
  "Bathroom Remodeling",
  "ADU & Home Addition",
  "Exterior Remodeling & Outdoor Living",
  "As-Built Plans",
  "2D & 3D Planning & Design",
  "Permitting",
  "BIM",
  "Other",
] as const;

export type ProjectType = (typeof projectTypes)[number];
