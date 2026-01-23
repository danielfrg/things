repomix:
    repomix --copy --ignore "packages/web/drizzle/meta/*.json"
    rm repomix-output.md 


image:
    docker build -t things .


docker-run:
    docker run -it -p 3000:3000 -e BETTER_AUTH_SECRET=12345 -v $(pwd)/packages/web/data:/data things
