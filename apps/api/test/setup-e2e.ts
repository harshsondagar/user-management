// test/jest-setup.ts
jest.mock('@css-inline/css-inline', () => ({
    inline: (html: string) => html,
    CSSInliner: class {
        inline(html: string) {
            return html;
        }
    },
}));