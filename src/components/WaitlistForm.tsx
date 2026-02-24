"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import useApi from "@/lib/hooks/useApi";
import config from "@/lib/config";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export default function WaitlistForm() {
  const { usePost } = useApi();
  const [isSuccess, setIsSuccess] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const joinWaitlist = usePost("/waitlist", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      setIsSuccess(true);
      setPosition(data.position);
      reset();
      toast.success(data.message || "You've been added to the waitlist!");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to join waitlist");
    },
  });

  const onSubmit = (data: WaitlistFormData) => {
    joinWaitlist.mutate(data);
  };

  const showPosition = config.features.waitlist?.showPosition !== false;

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600 font-semibold">
          ✓ You&apos;re on the waitlist!
        </div>
        {showPosition && position && (
          <p className="text-sm text-muted-foreground">
            Your position: #{position}
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setIsSuccess(false);
            setPosition(null);
          }}
        >
          Add Another Email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register("email")}
            disabled={joinWaitlist.isPending}
            className="h-12"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={joinWaitlist.isPending}
          className="h-12"
        >
          {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
        </Button>
      </div>
    </form>
  );
}
