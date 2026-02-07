repomix-web:
    repomix --copy --ignore "packages/sdk/src/gen/**,packages/sdk/openapi.json,packages/web/public/**,packages/server/drizzle/**,packages/cli/**"
    rm repomix-output.md 


repomix-all:
    repomix --copy --ignore "packages/sdk/src/gen/**,packages/sdk/openapi.json,packages/web/public/**,packages/server/drizzle/**"
    rm repomix-output.md 


image:
    docker build -t things .


docker-run:
    docker run -it -p 3000:3000 -e BETTER_AUTH_SECRET=12345 -v $(pwd)/packages/server/data:/data things
