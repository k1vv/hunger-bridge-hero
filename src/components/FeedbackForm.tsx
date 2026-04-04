import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";

export type FeedbackType = "donation" | "pickup" | "distribution" | "platform" | "vendor" | "ngo";

interface FeedbackFormProps {
  feedbackType: FeedbackType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  onSuccess?: () => void;
}

const FeedbackForm = ({
  feedbackType,
  relatedEntityType,
  relatedEntityId,
  triggerText = "Give Feedback",
  triggerVariant = "outline",
  onSuccess,
}: FeedbackFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in to submit feedback");
      if (rating === 0) throw new Error("Please select a rating");

      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        feedback_type: feedbackType,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
        rating,
        comment: comment.trim() || null,
        is_anonymous: isAnonymous,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setIsAnonymous(false);
  };

  const getFeedbackTitle = () => {
    switch (feedbackType) {
      case "donation":
        return "Rate this Donation";
      case "pickup":
        return "Rate your Pickup Experience";
      case "distribution":
        return "Rate this Distribution";
      case "platform":
        return "Platform Feedback";
      case "vendor":
        return "Rate this Vendor";
      case "ngo":
        return "Rate this NGO";
      default:
        return "Give Feedback";
    }
  };

  const getFeedbackDescription = () => {
    switch (feedbackType) {
      case "donation":
        return "How was the quality and condition of the donated food?";
      case "pickup":
        return "How was your pickup experience?";
      case "distribution":
        return "How was the distribution process?";
      case "platform":
        return "How can we improve FoodBridge?";
      case "vendor":
        return "How would you rate working with this vendor?";
      case "ngo":
        return "How would you rate working with this NGO?";
      default:
        return "Share your experience with us.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <MessageSquare className="h-4 w-4 mr-1" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getFeedbackTitle()}</DialogTitle>
          <DialogDescription>{getFeedbackDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comments (Optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience, suggestions, or concerns..."
              rows={3}
            />
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <label
              htmlFor="anonymous"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Submit anonymously
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submitFeedbackMutation.mutate()}
            disabled={rating === 0 || submitFeedbackMutation.isPending}
          >
            {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackForm;
