import dedent from 'ts-dedent';

import liquid from '../../src/transform/liquid';

const commentsByPage = [
    {
        linkUrl: 'https://example.com',
        comments: ['First comment', 'Second comment'],
    },
    {
        linkUrl: 'https://example2.com',
        comments: ['Third comment', 'Fourth comment'],
    },
];
const vars = {
    users: ['Alice', 'Ivan', 'Petr'],
    users2: ['alice', 'ivan', 'petr'],
    needCapitalize: true,
    user: 'Alex',
    user2: 'Alex',
    projects: [
        {projectName: 'First project', commentsByPage},
        {projectName: 'Second project', commentsByPage},
    ],
};

describe('Cycles', () => {
    describe('location', () => {
        test('Inline for block', () => {
            expect(
                liquid('Prefix {% for user in users %} {{user}} {% endfor %} Postfix', vars, ''),
            ).toEqual('Prefix Alice Ivan Petr Postfix');
        });

        test('Nested inline for block', () => {
            expect(
                liquid(
                    'Prefix {% for user1 in users %} {% for user2 in users %} {{user1}}+{{user2}} {% endfor %} {% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual(
                'Prefix Alice+Alice Alice+Ivan Alice+Petr Ivan+Alice Ivan+Ivan Ivan+Petr Petr+Alice Petr+Ivan Petr+Petr Postfix',
            );
        });

        test('Multiline for block', () => {
            expect(
                liquid(
                    dedent`
                    Prefix
                    {% for user in users %}
                    {{user}}
                    {% endfor %}
                    Postfix
                `,
                    vars,
                    '',
                ),
            ).toEqual(dedent`
                Prefix
                Alice
                Ivan
                Petr
                Postfix
            `);
        });

        test('Multiline for block2', () => {
            const input = dedent`
                Prefix

                {% for project in projects %}

                ## {{project.projectName}}
                {% for item in project.commentsByPage %}

                [{{item.linkUrl}}]({{item.linkUrl}})
                {% for item2 in item.comments %}
                * {{item2}}
                {% endfor %}

                {% endfor %}
                {% endfor %}

                Postfix
            `;
            const result = dedent`
                Prefix


                ## First project

                [https://example.com](https://example.com)
                * First comment
                * Second comment

                [https://example2.com](https://example2.com)
                * Third comment
                * Fourth comment

                ## Second project

                [https://example.com](https://example.com)
                * First comment
                * Second comment

                [https://example2.com](https://example2.com)
                * Third comment
                * Fourth comment

                Postfix
            `;
            expect(liquid(input, vars, '')).toEqual(result);
        });

        test('Multiline nested for block without indent', () => {
            expect(
                liquid(
                    dedent`
                    Prefix
                    {% for user1 in users %}
                    {% for user2 in users %}
                    {{user1}}+{{user2}}
                    {% endfor %}
                    {% endfor %}
                    Postfix
                `,
                    vars,
                    '',
                ),
            ).toEqual(dedent`
                Prefix
                Alice+Alice
                Alice+Ivan
                Alice+Petr
                Ivan+Alice
                Ivan+Ivan
                Ivan+Petr
                Petr+Alice
                Petr+Ivan
                Petr+Petr
                Postfix
            `);
        });
    });

    describe('with conditions, filters, substitutions', () => {
        test('Test 1', () => {
            expect(
                liquid(
                    'Prefix {% for user in users2 %}{% if needCapitalize %} {{user | capitalize}}+{{user2}} {% else %} {{user}} {% endif %}{% endfor %} Postfix',
                    vars,
                    '',
                ),
            ).toEqual('Prefix Alice+Alex Ivan+Alex Petr+Alex Postfix');
        });
    });

    describe('with code blocks', () => {
        test('code block before cycle block', () => {
            expect(
                liquid(
                    '```\nCode block\n```\n\n {% for user in users %} {{user}} {% endfor %}',
                    vars,
                    '',
                ),
            ).toEqual('```\nCode block\n```\n\n Alice Ivan Petr');
        });

        test('cycle block in code block', () => {
            expect(
                liquid('```\n{% for user in users %} {{user}} {% endfor %}\n```', vars, '', {
                    conditionsInCode: true,
                }),
            ).toEqual('```\nAlice Ivan Petr\n```');
        });
    });
});
