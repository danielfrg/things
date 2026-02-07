import { useNavigate } from "@solidjs/router"
import { createSignal, Show } from "solid-js"
import { Button } from "@/components/ui/button"
import { TextField, TextFieldInput, TextFieldLabel } from "@/components/ui/text-field"
import { useAuth } from "@/context/auth"

export function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = createSignal<"signin" | "signup">("signin")
  const [email, setEmail] = createSignal("")
  const [password, setPassword] = createSignal("")
  const [name, setName] = createSignal("")

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    const success =
      mode() === "signin" ? await auth.signIn(email(), password()) : await auth.signUp(email(), password(), name())

    if (success) {
      navigate("/inbox")
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-background p-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-foreground">Things</h1>
          <p class="text-sm text-muted-foreground mt-1">
            {mode() === "signin" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <Show when={mode() === "signup"}>
            <TextField value={name()} onChange={setName}>
              <TextFieldLabel>Name</TextFieldLabel>
              <TextFieldInput type="text" placeholder="Your name" required={mode() === "signup"} />
            </TextField>
          </Show>

          <TextField value={email()} onChange={setEmail}>
            <TextFieldLabel>Email</TextFieldLabel>
            <TextFieldInput type="email" placeholder="you@example.com" required />
          </TextField>

          <TextField value={password()} onChange={setPassword}>
            <TextFieldLabel>Password</TextFieldLabel>
            <TextFieldInput type="password" placeholder="********" required minLength={8} />
          </TextField>

          <Show when={auth.error}>
            <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {auth.error}
            </div>
          </Show>

          <Button type="submit" class="w-full" disabled={auth.loading}>
            {auth.loading ? "..." : mode() === "signin" ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div class="mt-6 text-center text-sm">
          <Show
            when={mode() === "signin"}
            fallback={
              <p class="text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} class="text-things-blue hover:underline">
                  Sign in
                </button>
              </p>
            }
          >
            <p class="text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("signup")} class="text-things-blue hover:underline">
                Sign up
              </button>
            </p>
          </Show>
        </div>
      </div>
    </div>
  )
}
